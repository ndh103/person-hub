import ChallengeStatus from './challenge-status';

class Challenge {
    id!: number;
    userId!: string;
    title!: string;
    description!: string;
    status!: ChallengeStatus;
}

export default Challenge;