<template>
<div class="border-red-300 border-b-2 p-4"><span class="font-medium cursor-pointer" @click="gotoDetail()">{{todoItemOverview.title}}</span></div></template>

<script lang="ts">
import { PropType } from "vue"
import { Vue } from "vue-property-decorator"
import TodoItemModel from "@/api-services/models/TodoItemModel"

const TodoItemOverview = Vue.extend({
    props:{
        todoItemOverview: {
            type: Object as PropType<TodoItemModel>
        }
    },
    methods:{
        gotoDetail(){
            this.$router.push(`/todos/${this.todoItemOverview.id}`);
        }
    }
});

export default TodoItemOverview;
</script>

<style>
</style>