"use client";
import { useEffect, useState } from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    setShow(true);
  }, []);

  return (
    <div 
      className={`transition-all duration-500 ease-out ${
        show ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
      }`}
    >
      {children}
    </div>
  );
}