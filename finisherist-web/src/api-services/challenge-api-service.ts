import ChallengeModel from "./models/ChallengeModel";
import http from "@/common/http-base";
import { AxiosResponse } from "axios";

class ChallengeApiService
{
    add(challenge: ChallengeModel): Promise<AxiosResponse<any>>{
        return http.post('challenges', challenge);
    }

    getAll(): Promise<AxiosResponse<any>>{
        return http.get(`challenges`);
    }

    update(challenge: ChallengeModel): Promise<AxiosResponse<any>>{
        return http.put(`challenges/${challenge.id}`, challenge);
    }

    delete(challenge: ChallengeModel): Promise<AxiosResponse<any>>{
        return http.delete(`challenges/${challenge.id}`);
    }
}

const challengeApiService = new ChallengeApiService();

export default challengeApiService;