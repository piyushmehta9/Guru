"use client"
import Link from "next/link";
import { Button } from "./ui/button";
import Image from "next/image";
import { useEffect, useRef } from "react";


const HeroSection = () => {
  const imageref=useRef(null);
  useEffect(()=>{
    const imageElement=imageref.current;
    const handleScroll=()=>{
    const scrollPosition=window.scrollY;
    const scrollThreshold=100;
    if(scrollPosition>scrollThreshold){
          imageElement.classList.add("scrolled");
  }
  else{
    imageElement.classList.remove("scrolled");
  }
};
window.addEventListener("scroll",handleScroll);
return ()=> window.removeEventListener("scroll",handleScroll);
  },[])

  return (
    <section className="w-full pt-36 md:pt-48 pb-10">
      <div className="space-y-6 text-center">
        <div className="space-y-6 mx-auto">
          <h1 className="text-5xl font-bold md:text-6xl lg:text-7xl xl:text-8xl grad-title">
            Time to Elevate your Career
            <br />
            with Ai Guru
          </h1>
          <p className="mx-auto m-w-[600px] text-muted-foreground md:text-xl">
            Build your Career, Not just Resume. With personalized tips, mock
            quizes and many more AI powered tools
          </p>
        </div>

        <div className="flex justify-center space-x-4">
            <Link href="/dashboard">
                <Button size="lg" className="px-8">Get Started</Button>
            </Link>
        </div>

    
    <div className="hero-image-wrapper mt-5 md:mt-0">
        <div ref={imageref} className="hero-image">
        <Image 
            src={"/bn2.png"}
            width={1080}
            height={720}
            alt="banner-ai"
            className="rounded-lg shadow-2xl mx-auto hero-img"
            priority
        />
        </div>
    </div>

      </div>
    </section>
  );
};
export default HeroSection;
