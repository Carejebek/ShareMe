export default function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.round(rating);
  return (
    <span className="text-yellow-500">
      {'★'.repeat(fullStars)}
      {'☆'.repeat(5 - fullStars)}
    </span>
  );
}
