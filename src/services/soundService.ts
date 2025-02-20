class SoundService {
  private successSound: HTMLAudioElement;
  private roundStartSound: HTMLAudioElement;
  private otherPlayerSuccessSound: HTMLAudioElement;
  private failureSound: HTMLAudioElement;
  private countdownSound: HTMLAudioElement;
  private countdownTimeout: number | null = null;

  constructor() {
    this.successSound = new Audio(
      "https://freesound.org/data/previews/320/320655_5260872-lq.mp3"
    );
    this.failureSound = new Audio(
      "https://cdn.freesound.org/previews/639/639961_8077125-lq.mp3"
    );
    this.roundStartSound = new Audio(
      "https://freesound.org/data/previews/253/253172_4404552-lq.mp3"
    );
    this.otherPlayerSuccessSound = new Audio(
      "https://freesound.org/data/previews/341/341695_5858296-lq.mp3"
    );
    this.countdownSound = new Audio(
      "https://cdn.freesound.org/previews/172/172967_1015240-lq.mp3"
    );
  }

  playSuccess() {
    this.successSound.currentTime = 0;
    this.successSound.play();
  }

  playFailure() {
    this.failureSound.currentTime = 0;
    this.failureSound.play();
  }

  playRoundStart() {
    this.roundStartSound.currentTime = 0;
    this.roundStartSound.play();
  }

  playOtherPlayerSuccess() {
    this.otherPlayerSuccessSound.currentTime = 0;
    this.otherPlayerSuccessSound.play();
  }

  playCountdown() {
    this.countdownSound.currentTime = 0;
    this.countdownSound.volume = 0.2;
    this.countdownSound.play();
  }

  scheduleCountdown(durationMs: number) {
    this.clearCountdownTimeout();
    // Schedule countdown 3 seconds before intermission ends
    this.countdownTimeout = window.setTimeout(() => {
      this.playCountdown();
    }, durationMs - 5000);
  }

  clearCountdownTimeout() {
    if (this.countdownTimeout) {
      window.clearTimeout(this.countdownTimeout);
      this.countdownTimeout = null;
    }
  }
}

export const soundService = new SoundService();
