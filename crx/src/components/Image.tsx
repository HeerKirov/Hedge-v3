import { styled } from "styled-components"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, RADIUS_SIZES } from "@/styles"

export function ThumbnailImage(props: {file?: string | null, alt?: string}) {
    return <ThumbnailImageDiv>
        <img src={props.file ?? undefined} alt={props.alt}/>
    </ThumbnailImageDiv>
}

const ThumbnailImageDiv = styled.div`
    text-align: center;
    position: relative;
    width: 100%;
    max-height: 100%;
    aspect-ratio: 1;
    > img {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        object-fit: contain;
        object-position: center;
        border-radius: ${RADIUS_SIZES["std"]};
        border: solid 1px ${LIGHT_MODE_COLORS["border"]};
        @media (prefers-color-scheme: dark) {
            border-color: ${DARK_MODE_COLORS["border"]};
        }
    }
`