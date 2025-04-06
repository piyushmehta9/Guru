import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function NotFound(){
    return (
        <div className="flex flex-col items-center justify-center min-h-[100vh] px-4">
            <h1 className="text-6xl font-bold gradient-title mb-4">404</h1>
            <h1 className="text-2xl font-semibold mb-4">Page Not Found</h1>
            <p className="text-gray-600 mb-8">Oops! The page you are looking for doesn't exist or has been moved</p>

            <Link href={"/"}><Button>Back to Home</Button></Link>
        </div>
    );
}