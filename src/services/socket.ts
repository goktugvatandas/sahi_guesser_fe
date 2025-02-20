import { debounce } from "lodash";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../types/socket";
import { soundService } from "./soundService";

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null =
    null;

  connect(): void {
    const token = localStorage.getItem("token");
    let extraHeaders: Record<string, string> = {};
    if (token) {
      extraHeaders = {
        Authorization: `Bearer ${token}`,
      };
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL ?? "/";
    const isLocal = socketUrl.includes("local");

    console.log("socketUrl", socketUrl);
    console.log("isLocal", isLocal);

    this.socket = io(socketUrl, {
      path: isLocal ? "/socket.io/" : "/ws/socket.io/",
      autoConnect: false,
      extraHeaders,
      transportOptions: {
        websocket: {
          extraHeaders,
        },
      },
      query: {
        token,
      },
      transports: ["websocket"],
    });

    // if (!token) {
    //   console.log("No token, not connecting to socket");
    // } else {
    //   this.socket.connect();
    //   this.setupListeners();
    // }

    this.socket.connect();
    this.setupListeners();
  }

  reconnect(): void {
    if (this.socket) {
      // Clean up existing listeners and disconnect
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    // Establish new connection
    this.connect();
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on(
      "gameState",
      ({ status, listing, roundStartTime, roundDuration }) => {
        useGameStore.getState().setGameStatus(status);
        useGameStore.getState().setCurrentListing(listing);
        useGameStore
          .getState()
          .setRoundInfo(new Date(roundStartTime), roundDuration);
      }
    );

    this.socket.on("intermissionStart", ({ duration }) => {
      useGameStore.getState().setIntermissionDuration(duration);
      useGameStore.getState().setGameStatus("INTERMISSION");
      soundService.scheduleCountdown(duration);
    });

    this.socket.on("onlinePlayers", ({ players }) => {
      useGameStore.getState().setOnlinePlayers(players);
    });

    this.socket.on("roundStart", ({ listing, duration }) => {
      const state = useGameStore.getState();

      state.setGuessCount(0);
      state.setGameStatus("PLAYING");
      state.setFeedback(null);
      state.setHasCorrectGuess(false);
      state.setCurrentListing(listing);
      state.setRoundInfo(new Date(), duration);
      state.setShowResults(false);
      state.setRoundEndScores([]);
      state.setCorrectPrice(null);
      state.setLastGuesses([]);
      state.setCorrectGuesses([]);
      state.setIncorrectGuesses([]);

      soundService.playRoundStart();
    });

    this.socket.on("roundEnd", ({ correctPrice, scores }) => {
      const state = useGameStore.getState();
      const authState = useAuthStore.getState();

      let currentUserScore = 0;
      const onlinePlayers = state.onlinePlayers;
      const updatedOnlinePlayers = onlinePlayers.map((player) => {
        const score = scores.find((s) => s.playerId === player.playerId);
        if (player.userId === authState.user?.id) {
          currentUserScore = score?.userScore || 0;
        }
        return {
          ...player,
          totalScore: score?.userScore || 0,
          roomScore: score?.roomScore || 0,
        };
      });
      state.setOnlinePlayers(updatedOnlinePlayers);
      state.setCorrectPrice(correctPrice);
      state.setRoundEndScores(scores);

      state.setShowResults(true);

      if (authState.user) {
        authState.setUser({
          ...authState.user,
          score: currentUserScore,
        });
      }
    });

    // Debounce the guess result handler
    const debouncedGuessResult = debounce(
      (direction: "correct" | "go_higher" | "go_lower") => {
        useGameStore.getState().setFeedback(direction);
        if (direction === "correct") {
          useGameStore.getState().setHasCorrectGuess(true);
          soundService.playSuccess();
        } else {
          soundService.playFailure();
        }
      },
      100,
      { leading: true, trailing: false }
    );

    this.socket.on("guessResult", ({ direction, guessCount }) => {
      const state = useGameStore.getState();
      debouncedGuessResult(direction);

      state.setGuessCount(guessCount);
    });

    this.socket.on("correctGuess", ({ userId, playerId, username }) => {
      const authUser = useAuthStore.getState().user;
      if (userId !== authUser?.id) {
        soundService.playOtherPlayerSuccess();
      }

      useGameStore.getState().addCorrectGuess({
        userId,
        playerId,
        username,
        isCorrect: true,
      });
    });

    // Batch incorrect guesses
    let incorrectGuessBuffer: Array<{
      userId: number;
      playerId: number;
      username: string;
      isCorrect: false;
    }> = [];
    const flushIncorrectGuesses = debounce(() => {
      if (incorrectGuessBuffer.length > 0) {
        useGameStore.getState().setIncorrectGuesses(
          incorrectGuessBuffer.map((guess) => ({
            ...guess,
            isCorrect: false,
          }))
        );
        useGameStore
          .getState()
          .setLastGuesses(
            [
              ...incorrectGuessBuffer,
              ...useGameStore.getState().lastGuesses,
            ].slice(0, 5)
          );
        incorrectGuessBuffer = [];
      }
    }, 100);

    this.socket.on("incorrectGuess", (data) => {
      incorrectGuessBuffer.push({
        ...data,
        isCorrect: false,
      });
      flushIncorrectGuesses();
    });

    this.socket.on("chatMessage", ({ userId, username, message }) => {
      const state = useGameStore.getState();
      useGameStore.getState().setChatMessages(
        [
          ...state.chatMessages,
          {
            id: new Date().getTime().toString(),
            userId,
            username,
            message,
            timestamp: new Date(),
          },
        ].slice(-100)
      );
    });

    this.socket.on(
      "playerJoined",
      ({ userId, playerId, username, roomScore }) => {
        const onlinePlayers = useGameStore.getState().onlinePlayers;
        // check online players and add the new player if not exists.
        const isExists = onlinePlayers.some(
          (player) => player.playerId === playerId
        );
        if (isExists) {
          return;
        }
        useGameStore
          .getState()
          .setOnlinePlayers([
            ...onlinePlayers,
            { userId, playerId, username, roomScore, totalScore: 0 },
          ]);
      }
    );

    this.socket.on("playerLeft", ({ playerId }) => {
      const onlinePlayers = useGameStore.getState().onlinePlayers;
      useGameStore
        .getState()
        .setOnlinePlayers(
          onlinePlayers.filter((player) => player.playerId !== playerId)
        );
    });
    this.socket.on("roomEnd", () => {
      const state = useGameStore.getState();

      state.setRoomId(null);
      state.setRoom(null);
      state.setCurrentListing(null);
    });

    this.socket?.io.on("reconnect", () => {
      try {
        const state = useGameStore.getState();
        const roomId = state.roomId;
        if (roomId) {
          this.joinRoom(roomId);
        }
      } catch (error) {
        console.error("Error reconnecting to socket", error);
      }
    });
  }

  joinRoom(roomId: number): void {
    this.socket?.emit("joinRoom", { roomId });
    useGameStore.getState().setRoomId(roomId);
  }

  sendMessage(roomId: number, message: string) {
    this.socket?.emit("chatMessage", { roomId, message });
  }

  leaveRoom(roomId: number): void {
    this.socket?.emit("leaveRoom", { roomId });
    useGameStore.getState().setRoomId(null);

    useGameStore.getState().setCurrentListing(null);
    soundService.clearCountdownTimeout();
  }

  submitGuess(roomId: number, price: number): void {
    this.socket?.emit("submitGuess", { roomId, price });
  }

  disconnect(): void {
    soundService.clearCountdownTimeout();
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketService = new SocketService();
