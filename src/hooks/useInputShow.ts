import { makeEventListener } from "@solid-primitives/event-listener"
import { createSignal } from "solid-js"
import { RootStore } from "~/store"
export const useInputShow = (props: { handleInput?: () => void }) => {
  const { store } = RootStore
  const { handleInput } = props
  const [compositionend, setCompositionend] = createSignal(true)
  const inputShow = () => {
    if (store.inputRef) {
      makeEventListener(
        store.inputRef,
        "compositionend",
        () => {
          setCompositionend(true)
          handleInput && handleInput()
        },
        { passive: true }
      )
      makeEventListener(
        store.inputRef,
        "compositionstart",
        () => {
          setCompositionend(false)
        },
        { passive: true }
      )
    }
  }
  return {
    compositionend,
    setCompositionend,
    inputShow,
    handleInput
  }
}