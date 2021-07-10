import TodoItemModel from "./models/TodoItemModel";
import http from "@/common/http-base";
import { AxiosResponse } from "axios";

class TodoItemApiService
{
    add(todoItem: TodoItemModel): Promise<AxiosResponse<any>>{
        return http.post('todos/items', todoItem);
    }

    query(status: number): Promise<AxiosResponse<any>>{
        return http.get(`todos/items/status/${status}`);
    }

    get(id: string): Promise<AxiosResponse<any>>{
        return http.get(`todos/items/${id}/details`);
    }

    update(todoItem: TodoItemModel): Promise<AxiosResponse<any>>{
        return http.put(`todos/items/${todoItem.id}`, todoItem);
    }

    delete(todoItem: TodoItemModel): Promise<AxiosResponse<any>>{
        return http.delete(`challenges/${todoItem.id}`);
    }
}

const todoItemApiService = new TodoItemApiService();

export default todoItemApiService;