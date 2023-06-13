import { makeEventListener } from "@solid-primitives/event-listener"
import { Fzf } from "fzf"
import {
  type Accessor,
  type Setter,
  Show,
  createEffect,
  onMount,
  batch
} from "solid-js"
import { FZFData, RootStore, loadSession } from "~/store"
import type { Option } from "~/types"
import { parsePrompts, scrollToBottom } from "~/utils"
import SettingAction, { actionState, type FakeRoleUnion } from "./SettingAction"
import SlashSelector from "./SlashSelector"
import { useNavigate } from "solid-start"
import { useInputShow } from "~/hooks/useInputShow"
import { useOptions } from "~/hooks/useOptions"
// 3em
export const defaultInputBoxHeight = 48
export default function ({
  width,
  height,
  setHeight,
  sendMessage,
  stopStreamFetch
}: {
  width: Accessor<string>
  height: Accessor<number>
  setHeight: Setter<number>
  sendMessage(content?: string, fakeRole?: FakeRoleUnion): void
  stopStreamFetch(): void
}) {
  const { candidateOptions, setCandidateOptions, handleInput, setSuitableheight } = useOptions({ setHeight })
  const { setCompositionend } = useInputShow({ handleInput })
  const navgiate = useNavigate()
  const { store, setStore } = RootStore
  onMount(() => {
    setTimeout(() => {
      FZFData.promptOptions = parsePrompts().map(
        k => ({ title: k.desc, desc: k.detail } as Option)
      )
      FZFData.fzfPrompts = new Fzf(FZFData.promptOptions, {
        selector: k => `${k.title}\n${k.desc}`
      })
    }, 500)
    if (store.inputRef) {
      makeEventListener(
        store.inputRef,
        "compositionend",
        () => {
          setCompositionend(true)
          handleInput()
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
  })

  createEffect(prev => {
    store.inputContent
    if (prev) {
      batch(() => {
        setHeight(defaultInputBoxHeight)
        if (store.inputContent === "") {
          setCandidateOptions([])
        } else {
          setSuitableheight()
        }
      })
    }
    return true
  })

  function selectOption(option?: Option) {
    batch(() => {
      if (option) {
        if (option.extra?.id) {
          navgiate(`/session/${option.extra.id}`)
          loadSession(option.extra.id)
          setStore("inputContent", "")
        } else setStore("inputContent", option.desc)
      }
      setCandidateOptions([])
      setSuitableheight()
    })
    store.inputRef?.focus()
  }

  return (
    <div
      class="pb-2em px-2em fixed bottom-0 z-100"
      style={{
        "background-color": "var(--c-bg)",
        width: width() === "init" ? "100%" : width()
      }}
    >
      <div
        style={{
          transition: "opacity 1s ease-in-out",
          opacity: width() === "init" ? 0 : 100
        }}
      >
        <Show when={!store.loading && !candidateOptions().length}>
          <SettingAction setCandidateOptions={setCandidateOptions} />
        </Show>
        <Show
          when={!store.loading}
          fallback={
            <div
              class="animate-gradient-border cursor-pointer dark:bg-#292B31/90 bg-#E7EBF0/80 h-3em flex items-center justify-center"
              onClick={stopStreamFetch}
            >
              <span class="dark:text-slate text-slate-7">
                AI 正在思考 / {store.currentMessageToken} / $
                {store.currentMessageToken$.toFixed(4)}
              </span>
            </div>
          }
        >
          <SlashSelector
            options={candidateOptions()}
            select={selectOption}
          ></SlashSelector>
          <div class="flex items-end relative">
            <textarea
              ref={el => setStore("inputRef", el)}
              id="input"
              placeholder="与 ta 对话吧"
              autocomplete="off"
              value={store.inputContent}
              autofocus
              onClick={scrollToBottom}
              onKeyDown={e => {
                if (e.isComposing) return
                if (candidateOptions().length) {
                  if (
                    e.key === "ArrowUp" ||
                    e.key === "ArrowDown" ||
                    e.keyCode === 13
                  ) {
                    e.preventDefault()
                  }
                } else if (e.keyCode === 13) {
                  if (!e.shiftKey && store.globalSettings.enterToSend) {
                    e.preventDefault()
                    sendMessage(undefined, actionState.fakeRole)
                  }
                } else if (e.key === "ArrowUp") {
                  const userMessages = store.messageList
                    .filter(k => k.role === "user")
                    .map(k => k.content)
                  const content = userMessages.at(-1)
                  if (content && !store.inputContent) {
                    e.preventDefault()
                    setStore("inputContent", content)
                  }
                }
              }
              }
              onInput={handleInput}
              style={{
                height: height() + "px"
              }}
              class="self-end p-3 pr-2.2em resize-none w-full text-slate-7 dark:text-slate bg-slate bg-op-15 focus:(bg-op-20 ring-0 outline-none) placeholder:(text-slate-800 dark:text-slate-400 op-40)"
              classList={{
                "rounded-t": candidateOptions().length === 0,
                "rounded-b": true
              }}
            />
            <Show when={store.inputContent}>
              <div
                class="absolute flex text-1em items-center"
                classList={{
                  "right-2.5em bottom-1em": height() === defaultInputBoxHeight,
                  "right-0.8em top-0.8em": height() !== defaultInputBoxHeight
                }}
              >
                <button
                  class="i-carbon:add-filled rotate-45 text-slate-7 dark:text-slate text-op-20! hover:text-op-60!"
                  onClick={() => {
                    setStore("inputContent", "")
                    store.inputRef?.focus()
                  }}
                />
              </div>
            </Show>
            <div class="absolute right-0.5em bottom-0.8em flex items-center">
              <button
                title="发送"
                onClick={() => sendMessage(undefined, actionState.fakeRole)}
                class="i-carbon:send-filled text-1.5em text-slate-7 dark:text-slate text-op-80! hover:text-op-100!"
              />
            </div>
          </div>
        </Show>
      </div>
    </div>
  )
}
