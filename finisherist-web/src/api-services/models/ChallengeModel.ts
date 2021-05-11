import ChallengeStatusEnum from './ChallengeStatusEnum';

class ChallengeModel {
    id!: number;
    userId!: string;
    title!: string;
    description!: string;
    status!: ChallengeStatusEnum;
}

export default ChallengeModel;