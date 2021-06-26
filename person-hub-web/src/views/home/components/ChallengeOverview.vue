<template>
<div class="border-red-300 border-b-2 p-4"><span class="font-medium cursor-pointer" @click="gotoDetail()">{{challengeOverview.title}}</span></div></template>

<script lang="ts">
import Challenge from "@/api-services/models/ChallengeModel"
import { PropType } from "vue"
import { Vue } from "vue-property-decorator"

const ChallengeOverview = Vue.extend({
    props:{
        challengeOverview: {
            type: Object as PropType<Challenge>
        }
    },
    methods:{
        gotoDetail(){
            this.$router.push(`/challenge/${this.challengeOverview.id}`);
        }
    }
});

export default ChallengeOverview;
</script>

<style>
</style>