<script setup lang="ts">
import { Button } from "@/components/universal"
import { CheckBox, NumberInput } from "@/components/form"
import { Group } from "@/components/layout"
import { useSettingQueryData } from "@/services/api/setting"
import { usePropertySot } from "@/utils/forms"
import { toRefNullable } from "@/utils/reactivity"

const { data: settingQuery } = useSettingQueryData()

const [queryLimitOfQueryItems, queryLimitOfQueryItemsSot, saveQueryLimitOfQueryItems] = usePropertySot(toRefNullable(settingQuery, "queryLimitOfQueryItems"))

const [warningLimitOfUnionItems, warningLimitOfUnionItemsSot, saveWarningLimitOfUnionItems] = usePropertySot(toRefNullable(settingQuery, "warningLimitOfUnionItems"))

const [warningLimitOfIntersectItems, warningLimitOfIntersectItemsSot, saveWarningLimitOfIntersectItems] = usePropertySot(toRefNullable(settingQuery, "warningLimitOfIntersectItems"))

</script>

<template>
    <template v-if="!!settingQuery">
        <label class="label">查询符号转义</label>
        <CheckBox class="mt-2" v-model:value="settingQuery.chineseSymbolReflect">识别中文字符</CheckBox>
        <p class="is-font-size-small secondary-text">查询语句中的中文字符会被识别为有效的符号。会被识别的中文字符包括<code>：～（）【】「」｜，。《》</code>。</p>
        <CheckBox class="mt-2" v-model:value="settingQuery.translateUnderscoreToSpace">转义普通下划线</CheckBox>
        <p class="is-font-size-small secondary-text">在受限字符串、关键字等非无限字符串位置的下划线(<code>_</code>)会被转义成空格。</p>
        
        <label class="label mt-2">单点查询数量上限</label>
        <Group class="mt-1">
            <NumberInput size="small" width="three-quarter" v-model:value="queryLimitOfQueryItems"/>
            <Button v-if="queryLimitOfQueryItemsSot" size="small" mode="filled" type="primary" icon="save" square @click="saveQueryLimitOfQueryItems"/>
        </Group>
        <p class="is-font-size-small secondary-text">查询结果优化：在对查询语句中的标签进行预查询时，对每个标签元素的单次查询的结果数限制。将此值设置在一个较低的水平，能有效规避输入匹配泛用性过强的查询时，获得的标签结果太多的情况。</p>
        
        <label class="label mt-2">元素项中元素数警告阈值</label>
        <Group class="mt-1">
            <NumberInput size="small" width="three-quarter" v-model:value="warningLimitOfUnionItems"/>
            <Button v-if="warningLimitOfUnionItemsSot" size="small" mode="filled" type="primary" icon="save" square @click="saveWarningLimitOfUnionItems"/>
        </Group>
        <p class="is-font-size-small secondary-text">查询警告：如果一个元素项中，元素数超出了阈值，就会提出警告。在执行查询时，以OR方式连接的元素数过多，可能拖慢查询效率。</p>
        
        <label class="label mt-2">元素项数警告阈值</label>
        <Group class="mt-1">
            <NumberInput size="small" width="three-quarter" v-model:value="warningLimitOfIntersectItems"/>
            <Button v-if="warningLimitOfIntersectItemsSot" size="small" mode="filled" type="primary" icon="save" square @click="saveWarningLimitOfIntersectItems"/>
        </Group>
        <p class="is-font-size-small secondary-text">查询警告：如果元素项的总数超出了阈值，就会提出警告。在执行查询时，以AND方式连接的元素数过多，可能严重拖慢查询效率。</p>
    </template>
</template>