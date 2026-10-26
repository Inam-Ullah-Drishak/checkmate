import { getImageProps } from "next/image";

/**
 * The robot form's stand-in for the chess scene (D-016): the pieces as the
 * scene settles, captured from the build (`tools/capture-still.mjs --canvas
 * --clip`) for the cell's two shapes — the tall `lg` column and the stacked
 * landscape cell below it. Nothing WebGL is fetched for it.
 */
export const ChessStill = () => {
  const common = { alt: "", quality: 80 };
  const {
    props: { srcSet: tall },
  } = getImageProps({
    ...common,
    src: "/assets/chess-still-desktop.webp",
    width: 413,
    height: 845,
    sizes: "30vw",
  });
  const { props: wide } = getImageProps({
    ...common,
    src: "/assets/chess-still-mobile.webp",
    width: 728,
    height: 906,
    sizes: "100vw",
    fetchPriority: "high",
  });

  return (
    <picture>
      <source media="(min-width: 1024px)" srcSet={tall} sizes="30vw" />
      <img
        {...wide}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </picture>
  );
};
