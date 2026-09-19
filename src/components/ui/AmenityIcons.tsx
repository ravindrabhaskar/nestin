import React from 'react';
import { Icon } from './Icon';

// 1. High-Speed Wi-Fi Icon
export const WifiAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="wifi" size={size} className={className} />;

// 2. Air Conditioning (AC) Split Unit Icon
export const AirConditionerAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="ac" size={size} className={className} />;

// 3. Housekeeping / Daily Room Cleaning Icon
export const HousekeepingAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="housekeeping" size={size} className={className} />;

// 4. Laundry / Washing Machine Icon
export const LaundryAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="laundry" size={size} className={className} />;

// 5. Power Backup Icon
export const PowerBackupAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="powerBackup" size={size} className={className} />;

// 6. CCTV Security Camera Icon
export const CctvAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="cctv" size={size} className={className} />;

// 7. RO Water / Purified Drinking Water Icon
export const RoWaterAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="water" size={size} className={className} />;

// 8. Study & Work Hub Icon
export const StudyWorkAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="study" size={size} className={className} />;

// 9. Food & Dining / Meals Icon
export const FoodAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="food" size={size} className={className} />;

// 10. Gym & Fitness Hub Icon
export const GymAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="gym" size={size} className={className} />;

// 11. Vehicle Parking Icon
export const ParkingAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="parking" size={size} className={className} />;

// 12. Television & Entertainment Icon
export const TvAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="tv" size={size} className={className} />;

// 13. Hot Water Geyser Icon
export const GeyserAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="geyser" size={size} className={className} />;

// 14. Lift / Elevator Icon
export const LiftAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="lift" size={size} className={className} />;

// 15. Biometric Smart Entry Icon
export const BiometricAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="biometric" size={size} className={className} />;

// 16. Refrigerator Icon
export const RefrigeratorAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="fridge" size={size} className={className} />;

// 17. Gaming & Recreation Lounge Icon
export const GamingAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="gaming" size={size} className={className} />;

// 18. Cafeteria / Coffee Icon
export const CafeAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="cafe" size={size} className={className} />;

// 19. Furnished Bed Icon
export const FurnishedBedAmenityIcon: React.FC<{ className?: string; size?: number }> = ({
  className = 'text-current',
  size = 16,
}) => <Icon name="bed" size={size} className={className} />;

// Helper function to resolve any amenity string into a standardized Icon
export const getAmenityIconComponent = (name: string, className = 'text-current', size: number = 14) => {
  const lower = name.toLowerCase();
  if (lower.includes('wifi') || lower.includes('internet') || lower.includes('broadband')) {
    return <Icon name="wifi" size={size} className={className} />;
  }
  if (lower.includes('ac') || lower.includes('air conditioner') || lower.includes('cooling')) {
    return <Icon name="ac" size={size} className={className} />;
  }
  if (lower.includes('housekeeping') || lower.includes('cleaning') || lower.includes('room service')) {
    return <Icon name="housekeeping" size={size} className={className} />;
  }
  if (lower.includes('laundry') || lower.includes('washing') || lower.includes('clothes')) {
    return <Icon name="laundry" size={size} className={className} />;
  }
  if (lower.includes('power') || lower.includes('backup') || lower.includes('generator')) {
    return <Icon name="powerBackup" size={size} className={className} />;
  }
  if (lower.includes('security') || lower.includes('cctv') || lower.includes('guard')) {
    return <Icon name="cctv" size={size} className={className} />;
  }
  if (lower.includes('water') || lower.includes('ro') || lower.includes('purified')) {
    return <Icon name="water" size={size} className={className} />;
  }
  if (lower.includes('study') || lower.includes('work') || lower.includes('desk') || lower.includes('library')) {
    return <Icon name="study" size={size} className={className} />;
  }
  if (
    lower.includes('food') ||
    lower.includes('meal') ||
    lower.includes('kitchen') ||
    lower.includes('mess') ||
    lower.includes('dining')
  ) {
    return <Icon name="food" size={size} className={className} />;
  }
  if (lower.includes('gym') || lower.includes('fitness') || lower.includes('workout')) {
    return <Icon name="gym" size={size} className={className} />;
  }
  if (lower.includes('parking') || lower.includes('vehicle') || lower.includes('car') || lower.includes('bike')) {
    return <Icon name="parking" size={size} className={className} />;
  }
  if (
    lower.includes('tv') ||
    lower.includes('television') ||
    lower.includes('entertainment') ||
    lower.includes('netflix')
  ) {
    return <Icon name="tv" size={size} className={className} />;
  }
  if (lower.includes('geyser') || lower.includes('hot water') || lower.includes('heater')) {
    return <Icon name="geyser" size={size} className={className} />;
  }
  if (lower.includes('lift') || lower.includes('elevator')) {
    return <Icon name="lift" size={size} className={className} />;
  }
  if (lower.includes('biometric') || lower.includes('key') || lower.includes('digital lock')) {
    return <Icon name="biometric" size={size} className={className} />;
  }
  if (lower.includes('fridge') || lower.includes('refrigerator')) {
    return <Icon name="fridge" size={size} className={className} />;
  }
  if (lower.includes('game') || lower.includes('playstation') || lower.includes('recreation')) {
    return <Icon name="gaming" size={size} className={className} />;
  }
  if (lower.includes('tea') || lower.includes('coffee') || lower.includes('cafe')) {
    return <Icon name="cafe" size={size} className={className} />;
  }
  if (lower.includes('bed') || lower.includes('furnished') || lower.includes('wardrobe')) {
    return <Icon name="bed" size={size} className={className} />;
  }
  return <Icon name="checkCircle" size={size} className={className} />;
};
