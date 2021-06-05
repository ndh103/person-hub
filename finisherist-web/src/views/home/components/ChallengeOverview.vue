<template>
<div class="border-red-300 border-b-2 p-4"><span class="font-medium cursor-pointer">{{challengeOverview.title}}</span></div></template>

<script lang="ts">
import Challenge from "@/api-services/models/ChallengeModel"
import { PropType } from "vue"
import { Vue } from "vue-property-decorator"

const ChallengeOverview = Vue.extend({
    props:{
        challengeOverview: {
            type: Object as PropType<Challenge>
        }
    }
})

export default ChallengeOverview;
</script>

<style>
</style>