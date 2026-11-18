"use client";

interface ButtonProps {
  title: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  icon?: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export const Button = ({
  title,
  onClick,
  icon,
  className = "",
  type = "button",
  disabled = false,
}: ButtonProps) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full p-1 px-2 cursor-pointer inline-flex justify-center items-center text-center gap-2 text-xs transition-all ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a3d] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <span>{title}</span>
      {icon}
    </button>
  );
};
