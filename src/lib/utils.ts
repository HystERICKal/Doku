import { twMerge } from "tailwind-merge";
import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: classValue[]) {
  //classValue needs clsx package to be installed
  //tailwind-merge (px-2 py-2 helps to merge it to => p-2)
  return twMerge(clsx(inputs)); //twMerge needs tailwind-merge package
}
