import { ArrowRight, Minus, Plus } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";

interface PriceInputProps {
  onGuess: (guess: number) => void;
  disabled?: boolean;
  listingType: string;
  listingId: number;
}

export const PriceInput: React.FC<PriceInputProps> = ({
  onGuess,
  disabled,
  listingType,
  listingId
}) => {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const minPrice = listingType === "car" ? 500000 : 5000;
  const maxPrice = listingType === "car" ? 5000000  : 50000 ;

  useEffect(() => {
    setValue("");
  }, [listingId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericValue = parseFloat(value.replace(/[^0-9]/g, ""));
    if (!isNaN(numericValue)) {
      onGuess(numericValue);
    }
  };

  const formatNumber = useCallback(
    (input: string, cursorPosition: number | null = null) => {
      const numbers = input.replace(/[^0-9]/g, "");
      if (numbers === "") return "";

      const formatted = new Intl.NumberFormat("tr-TR").format(
        parseInt(numbers)
      );

      if (cursorPosition !== null && inputRef.current) {
        const digitsBeforeCursor = input
          .slice(0, cursorPosition)
          .replace(/\./g, "").length;
        let newPosition = 0;
        let digitCount = 0;

        for (
          let i = 0;
          i < formatted.length && digitCount < digitsBeforeCursor;
          i++
        ) {
          if (formatted[i] !== ".") digitCount++;
          newPosition = i + 1;
        }

        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(newPosition, newPosition);
          }
        });
      }

      return formatted;
    },
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const cursorPosition = e.target.selectionStart;

    // Only format if the input contains valid characters
    if (/^[\d.,]*$/.test(input)) {
      setValue(formatNumber(input, cursorPosition));
    }
  };

  const adjustValue = useCallback(
    (amount: number) => {
      const currentValue = parseInt(value.replace(/[^0-9]/g, "")) || 0;
      const newValue = Math.max(0, currentValue + amount);
      setValue(formatNumber(newValue.toString()));
    },
    [value, formatNumber]
  );

  const QuickActionButton = useMemo(() => {
    return React.memo<{ amount: number }>(({ amount }) => {
      const isAddition = amount > 0;
      const formattedAmount = new Intl.NumberFormat("tr-TR").format(
        Math.abs(amount)
      );

      return (
        <button
          type="button"
          onClick={() => adjustValue(amount)}
          disabled={disabled}
          className={`flex items-center justify-center gap-1 px-3 lg:px-3 py-2.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all min-w-[70px] lg:min-w-auto
            ${
              disabled
                ? "bg-gray-100 text-gray-400"
                : isAddition
                ? "bg-green-100 text-green-700 hover:bg-green-200 active:scale-95"
                : "bg-red-100 text-red-700 hover:bg-red-200 active:scale-95"
            }`}
        >
          {isAddition ? (
            <Plus size={14} className="lg:w-4 lg:h-4" />
          ) : (
            <Minus size={14} className="lg:w-4 lg:h-4" />
          )}
          {formattedAmount}
        </button>
      );
    });
  }, [disabled, adjustValue]);

  const quickActionAmounts = useMemo(() => {
    const baseAmounts =
      listingType === "car" ? [1000, 10000, 100000,5000] : [500, 1000, 10000,500];
    return baseAmounts.map((amount) => ({
      positive: amount,
      negative: -amount,
    }));
  }, [listingType]);

  return (
    <div className="w-full max-w-md space-y-3 lg:space-y-3">
      <div className="flex gap-2 lg:gap-2">
        {!isMobile && (
        <div className="flex flex-col gap-2 lg:gap-2">
          {quickActionAmounts.slice(0, 2).map(({ negative }, idx) => (
            <QuickActionButton key={`neg-${idx}`} amount={negative} />
          ))}
        </div>)}

        <form onSubmit={handleSubmit} className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 lg:pl-4 pointer-events-none">
              <span className="text-gray-500 text-base lg:text-lg font-medium">
                ₺
              </span>
            </div>
            <input
              autoFocus
              ref={inputRef}
              type="text"
              value={value}
              onChange={(handleInputChange)}
              className={`w-full pl-10 lg:pl-10 pr-20 lg:pr-20 py-4 lg:py-4 text-lg lg:text-xl bg-white border-2 
                ${disabled ? "border-gray-200 bg-gray-50" : "border-yellow-400"}
                rounded-xl focus:outline-none focus:border-yellow-500 transition-colors
                font-medium placeholder:text-gray-400`}
              placeholder="Tahmin et..."
              disabled={disabled}
            />
            <button
              type="submit"
              disabled={disabled || !value}
              className={`absolute right-2 top-1/2 -translate-y-1/2 
                ${
                  disabled || !value
                    ? "bg-gray-300"
                    : "bg-yellow-400 hover:bg-yellow-500 active:scale-95"
                }
                text-white p-3 lg:p-2 rounded-lg transition-all touch-manipulation`}
            >
              <ArrowRight size={24} className="lg:w-6 lg:h-6" />
            </button>
          </div>
          {isMobile && (
          <div className="w-full px-2 mt-2">
            <input
            id="price-range"
              type="range"
              min={minPrice}
              max={maxPrice}
              step={listingType === "car" ? 10000 : 1000}
              value={Number(value.replace(/[^0-9]/g, ''))}
              onChange={(e)=>setValue(formatNumber(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-400"
              style={{
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>₺{formatNumber(minPrice.toString())}</span>
              <span>₺{formatNumber(maxPrice.toString())}</span>
            </div>
          </div>
        )}
        </form>

       
{!isMobile && (
        <div className="flex flex-col gap-2 lg:gap-2">
          {quickActionAmounts.slice(0, 2).map(({ positive }, idx) => (
            <QuickActionButton key={`pos-${idx}`} amount={positive} />
          ))}
        </div>)}
      </div>

      <div className="flex justify-center gap-2 lg:gap-2">
        <QuickActionButton amount={isMobile ? quickActionAmounts[3].negative : quickActionAmounts[2].negative} />
        <QuickActionButton amount={isMobile ? quickActionAmounts[3].positive : quickActionAmounts[2].positive} />
      </div>
    </div>
  );
};
