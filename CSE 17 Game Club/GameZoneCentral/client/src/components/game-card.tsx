import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, StarHalf } from "lucide-react";

interface GameCardProps {
  id: string;
  title: string;
  description: string;
  image: string;
  rating: number;
  badge?: {
    text: string;
    color: 'primary' | 'secondary' | 'accent';
  };
  onClick: (id: string) => void;
}

export default function GameCard({
  id,
  title,
  description,
  image,
  rating,
  badge,
  onClick
}: GameCardProps) {
  // Generate stars based on rating
  const renderRating = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`star-${i}`} className="text-accent fill-current" />);
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      stars.push(<StarHalf key="half-star" className="text-accent fill-current" />);
    }
    
    // Add empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-star-${i}`} className="text-accent" />);
    }
    
    return stars;
  };

  // Get the appropriate badge color class
  const getBadgeClass = () => {
    if (!badge) return "";
    
    switch (badge.color) {
      case 'primary':
        return "bg-primary/20 text-primary";
      case 'secondary':
        return "bg-secondary/20 text-secondary";
      case 'accent':
        return "bg-accent/20 text-accent";
      default:
        return "bg-primary/20 text-primary";
    }
  };

  return (
    <Card className="game-card bg-card rounded-xl shadow-lg overflow-hidden">
      <img 
        src={image} 
        alt={`${title} Game`} 
        className="w-full h-40 object-cover"
      />
      
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-heading font-bold text-foreground">{title}</h3>
          {badge && (
            <span className={`${getBadgeClass()} text-xs px-2 py-1 rounded-full font-medium`}>
              {badge.text}
            </span>
          )}
        </div>
        
        <p className="text-muted-foreground text-sm mb-4">{description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 text-accent">
            {renderRating()}
            <span className="ml-1 text-muted-foreground text-sm">({rating})</span>
          </div>
          
          <Button onClick={() => onClick(id)}>
            Play Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
