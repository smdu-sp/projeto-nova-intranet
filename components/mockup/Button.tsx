"use client";

interface ButtonProps {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  icon?: React.ReactNode;
  className?: string;
}

export const Button = ({ title, onClick, icon, className }: ButtonProps) => {
  return (
    <button onClick={onClick} className={` rounded-full p-1 px-2 cursor-pointer flex justify-center items-center text-center gap-2 text-xs transition-all ease-in-out ${className}`}>
      {title} {icon}
    </button>
  );
};
