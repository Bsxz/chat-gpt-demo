import _throttle from "just-throttle"
import type { Setter } from "solid-js"
import { batch, createSignal } from "solid-js"
import { defaultInputBoxHeight } from "~/components/Chat/InputBox"
import { FZFData } from "~/store"
import type { Option } from "~/types"
import { RootStore } from "~/store"
import { useInputShow } from "./useInputShow"
export const useOptions = (props: { setHeight?: Setter<number> }) => {
  const { setHeight } = props
  const { compositionend } = useInputShow({})
  const { store, setStore } = RootStore
  const [candidateOptions, setCandidateOptions] = createSignal<Option[]>([])
  const throttle = _throttle(
    (value: string) => {
      if (/^\s{2,}$|^\/{2,}$/.test(value))
        return setCandidateOptions(FZFData.sessionOptions)
      if (value === "/" || value === " ")
        return setCandidateOptions(FZFData.promptOptions)
      const sessionQuery = value.replace(
        /^\s{2,}(.*)\s*$|^\/{2,}(.*)\s*$/,
        "$1$2"
      )
      const promptQuery = value.replace(/^\s(.*)\s*$|^\/(.*)\s*$/, "$1$2")
      if (sessionQuery !== value) {
        setCandidateOptions(
          FZFData.fzfSessions!.find(sessionQuery).map(k => ({
            ...k.item,
            positions: k.positions
          }))
        )
      } else if (promptQuery !== value) {
        setCandidateOptions(
          FZFData.fzfPrompts!.find(promptQuery).map(k => ({
            ...k.item,
            positions: k.positions
          }))
        )
      }
    },
    100,
    {
      trailing: false,
      leading: true
    }
  )
  const setSuitableheight = () => {
    const scrollHeight = store.inputRef?.scrollHeight
    if (scrollHeight && setHeight)
      setHeight(
        scrollHeight > window.innerHeight - 80
          ? window.innerHeight - 80
          : scrollHeight
      )
  }
  const handleInput = () => {
    // 重新设置高度，让输入框可以自适应高度，-1 是为了标记不是初始状态
    setHeight && setHeight(defaultInputBoxHeight - 1)
    batch(() => {
      setSuitableheight()
      if (!compositionend()) return
      const value = store.inputRef?.value
      if (value) {
        setStore("inputContent", value)
        throttle(value)
      }
      else {
        setStore("inputContent", "")
        setCandidateOptions([])
      }
    })
  }
  return {
    candidateOptions,
    setCandidateOptions,
    handleInput,
    throttle,
    setSuitableheight
  }
}