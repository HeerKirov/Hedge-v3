<script setup lang="ts">
import { RelatedSimpleTag } from "@/functions/http-client/api/tag"
import { RelatedSimpleTopic } from "@/functions/http-client/api/topic"
import { RelatedSimpleAuthor } from "@/functions/http-client/api/author"
import { MetaUtilIdentity } from "@/functions/http-client/api/util-meta"
import { Tagme } from "@/functions/http-client/api/illust"
import { SetValue, UpdateDataForm } from "./context"

const props = defineProps<{
    tags: RelatedSimpleTag[]
    topics: RelatedSimpleTopic[]
    authors: RelatedSimpleAuthor[]
    tagme?: Tagme[]
    identity?: MetaUtilIdentity | null
    setValue?: SetValue
    allowTagme?: boolean
}>()

const emit = defineEmits<{
    (e: "update", form: UpdateDataForm): void
}>()

</script>

<template>
    <div>
        hello?
        <div>

        </div>
        <div>

        </div>
        <div>

        </div>
    </div>
</template>

<style module lang="sass">

</style>
