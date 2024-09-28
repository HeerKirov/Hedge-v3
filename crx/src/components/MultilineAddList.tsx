import { useState } from "react"
import { styled } from "styled-components"
import { Button, FormattedText, Icon, Input, LayouttedDiv } from "@/components"
import { SPACINGS } from "@/styles"

interface MultilineAddListProps {
    value?: string[]
    onUpdateValue?: (value: string[]) => void
}

export function MultilineAddList(props: MultilineAddListProps) {
    const add = (newValue: string) => {
        if(!props.value?.includes(newValue)) {
            props.onUpdateValue?.([...(props.value ?? []), newValue])
        }
    }

    const remove = (removeItem: string) => {
        if(props.value !== undefined && props.onUpdateValue) {
            const idx = props.value.indexOf(removeItem)
            if(idx >= 0) {
                props.onUpdateValue([...props.value.slice(0, idx), ...props.value.slice(idx + 1)])
            }
        }
    }

    return <LayouttedDiv border borderColor="border" radius="std">
        <ContentDiv>
            {props.value?.map(item => <ListItem key={item} value={item} onRemove={remove}/>)}
        </ContentDiv>
        <AddItem onAdd={add}/>
    </LayouttedDiv>
}

function AddItem(props: {onAdd?: (item: string) => void}) {
    const [text, setText] = useState<string>("")

    const submit = () => {
        if(text.trim()) {
            props.onAdd?.(text.trim())
            setText("")
        }
    }

    return <BottomDiv>
        <Input size="small" updateOnInput value={text} onUpdateValue={setText} onEnter={submit}/>
        <Button size="small" type="success" onClick={submit}><Icon icon="plus"/></Button>
    </BottomDiv>
}

function ListItem(props: {value: string, onRemove?: (value: string) => void}) {
    return <ListItemDiv border borderColor="border" radius="round">
        <FormattedText mr={1} ml={2}>{props.value}</FormattedText>
        <Button size="tiny" round onClick={() => props.onRemove?.(props.value)}><Icon icon="close"/></Button>
    </ListItemDiv>
}

const ContentDiv = styled.div`
    min-height: 24px;
    max-height: 200px;
    overflow: auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-content: flex-start;
    align-items: baseline;
    gap: ${SPACINGS[1]};
    padding: ${SPACINGS[1]} ${SPACINGS[1]} 0 ${SPACINGS[1]};
`

const BottomDiv = styled.div`
    display: flex;
    flex-wrap: nowrap;
    margin: ${SPACINGS[1]};
    gap: ${SPACINGS[1]};
    > input {
        width: 100%;
    }
    > button {
        flex: 0 0 auto;
    }
`

const ListItemDiv = styled(LayouttedDiv)`
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
`