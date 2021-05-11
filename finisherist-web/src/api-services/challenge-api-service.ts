import ChallengeModel from "./models/ChallengeModel";
import http from "@/common/http-base";
import { AxiosResponse } from "axios";

class ChallengeApiService
{
    add(challenge: ChallengeModel): Promise<AxiosResponse<any>>{
        return http.post('challenge', challenge);
    }

    getAll(userId: string): Promise<AxiosResponse<any>>{
        return http.get(`challenge/${userId}`);
    }

    update(challenge: ChallengeModel): Promise<AxiosResponse<any>>{
        return http.put(`challenge/${challenge.id}`, challenge);
    }

    delete(challenge: ChallengeModel): Promise<AxiosResponse<any>>{
        return http.delete(`challenge/${challenge.id}`);
    }
}

const challengeApiService = new ChallengeApiService();

export default challengeApiService;