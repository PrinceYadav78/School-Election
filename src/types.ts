export type HouseType = 'Maxims' | 'Blue' | 'Green' | 'Yellow';

export interface Candidate {
  id: string;
  fullName: string;
  house: HouseType;
  post: string;
  photo: string; // Base64 data or pre-configured premium graphic reference
  motto: string;
  votes: number; // Kept secure and tabulated at the storage layer
  isJunior?: boolean;
}

export interface Voter {
  admissionNo: string;
  name?: string;
  house?: string;
  grade?: string;
  pin: string;
  hasVoted: boolean;
  votedAt?: string;
}

export interface PostDefinition {
  id: string;
  title: string;
  description: string;
  category?: 'Universal' | 'Senior' | 'Junior';
  eligibleGrades?: string[];
  eligibleHouses?: string[];
}

export interface ElectionConfig {
  isOpen: boolean;
  posts: PostDefinition[];
}
