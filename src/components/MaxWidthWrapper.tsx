import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const MaxWidthWrapper = ({
  className, //props (destructured by wrapping them iside '{}')
  children, //props (destructured by wrapping them iside '{}')
}: {
  //this is inside of an objet
  //below we declare the Typescript type since we are working with Typescript
  className?: string; //The question mark means that className is optional
  children: ReactNode;
}) => {
  return (
    //merge the classname we always want applied as the first argument
    <div className={cn("mx-auto w-full max-w-screen-xl px-2.5 md:px-20", className)}>
      {children}
    </div>
  );
};

export default MaxWidthWrapper;
