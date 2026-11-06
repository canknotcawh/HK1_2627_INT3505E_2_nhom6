import { useState } from "react";
import { Library } from "lucide-react";

type BookCoverProps = {
    imageUrl: string | null;
    title: string;
    imageClassName?: string;
    iconClassName?: string;
};

export default function BookCover({
    imageUrl,
    title,
    imageClassName = "w-full h-full object-cover",
    iconClassName = "w-8 h-8 text-gray-300"
}: BookCoverProps) {
    const [imageFailed, setImageFailed] = useState(false);

    if (!imageUrl || imageFailed) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                <Library className={iconClassName} aria-hidden="true" />
            </div>
        );
    }

    return (
        <img
            src={imageUrl}
            alt={`Bìa sách ${title}`}
            className={imageClassName}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
        />
    );
}
