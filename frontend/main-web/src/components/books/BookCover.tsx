import { useState } from "react";
import { Library } from "lucide-react";

type BookCoverProps = {
    imageUrl: string | null;
    title: string;
    imageClassName: string;
    iconClassName: string;
};

export default function BookCover({ imageUrl, title, imageClassName, iconClassName }: BookCoverProps) {
    const [imageFailed, setImageFailed] = useState(false);

    if (!imageUrl || imageFailed) {
        return <Library className={iconClassName} aria-hidden="true" />;
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
