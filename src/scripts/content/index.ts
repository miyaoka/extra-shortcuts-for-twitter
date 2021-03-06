type KeyDefs = [(string | string[])[], Function][]

let linkFocusIndex = 0
let extLinks: HTMLAnchorElement[] = []
let focusAnchorTarget: HTMLAnchorElement | null = null

const $ = (selector: string): HTMLElement | null =>
  document.querySelector(selector)
const $$ = (selector: string): NodeListOf<HTMLElement> =>
  document.querySelectorAll(selector)

const xLinkSelectors = ['[data-testid=tweet]', '[lang]'].map(
  container => `article ${container} a[target=_blank]`
)
const quoteSelector = '[role=blockquote]'
const focusSelector = [...xLinkSelectors, quoteSelector].join(',')
const articleSelector = 'article:not([style*="display: none"])'

const getExtLinks = () => {
  const target = $('article:focus')
  if (!target) return []

  const list = Array.from(
    target.querySelectorAll(focusSelector)
  ) as HTMLAnchorElement[]

  return list.filter(item => item.innerText)
}

const resetLinkFocus = () => {
  linkFocusIndex = 0
  extLinks.forEach(extLink => {
    extLink.removeAttribute('style')
  })
}

const focusLink = (evt: KeyboardEvent) => {
  evt.preventDefault()
  evt.stopPropagation()

  extLinks.forEach(extLink => {
    extLink.setAttribute('style', 'background: rgba(255,255,0,.4)')
  })

  focusAnchorTarget = extLinks[linkFocusIndex]
  if (!focusAnchorTarget) return
  focusAnchorTarget.setAttribute(
    'style',
    `background: rgba(255,255,0,1); outline: 1px solid #990`
  )
  focusAnchorTarget.focus()
  linkFocusIndex = (linkFocusIndex + 1) % extLinks.length
}

const getContainerArticle = (el: HTMLElement): HTMLElement | null => {
  const parent = el.parentElement
  if (!parent) return null
  if (parent.tagName === 'ARTICLE') return parent
  return getContainerArticle(parent)
}
const blurLink = () => {
  resetLinkFocus()

  if (!focusAnchorTarget) return
  const article = getContainerArticle(focusAnchorTarget)
  focusAnchorTarget = null
  article?.focus()
}

const getFocusTarget = (offset: number): HTMLElement | null => {
  const currentFocus = $('article:focus')
  const articles = Array.from($$(articleSelector))
  if (currentFocus) {
    const index = articles.findIndex(article => article === currentFocus)
    return articles[index + offset]
  }
  return articles[0]
}
const onFocusTweet = () => {
  blurLink()
  window.requestAnimationFrame(() => {
    extLinks = getExtLinks()
    resetLinkFocus()
  })
}
const focusTweet = (evt: KeyboardEvent, offset: number) => {
  blurLink()
  const target = getFocusTarget(offset)
  if (!target) return
  evt.preventDefault()
  evt.stopPropagation()
  target.focus()
  onFocusTweet()
}

const navVideo = (video: HTMLVideoElement) => {
  if (video.paused) {
    video.currentTime = 0
    video.play()
    video.setAttribute('style', 'opacity: inherit')
    video.muted = false
  } else {
    video.pause()
    video.setAttribute('style', 'opacity: 0.5')
    video.muted = true
  }
}

const navPhoto = () => {
  const next = $('[aria-label=Next]')
  if (next && next.getAttribute('disabled') == null) {
    next.click()
    return true
  }
  const close = $('[aria-label=Close]')
  if (close) {
    history.back()
    return true
  }
}

const getFocusedVideo = () => {
  return (document.fullscreenElement ||
    $('article:focus video')) as HTMLVideoElement | null
}

const navMedia = () => {
  const video = getFocusedVideo()
  if (video) {
    navVideo(video)
    return true
  }
  return navPhoto()
}

const navBack = () => {
  const back = $('[aria-label="Back"]')
  if (back && history.state) {
    history.back()
    return true
  }
  blurLink()
}

const toggleFullscreen = () => {
  const video = getFocusedVideo()
  if (!video) return

  if (document.fullscreen) {
    document.exitFullscreen()
    video.pause()
  } else {
    video.requestFullscreen()
  }
  return true
}

const keyDefs: KeyDefs = [
  [['j', 'k'], onFocusTweet],
  [['arrowdown'], (e: KeyboardEvent) => focusTweet(e, 1)],
  [['arrowup'], (e: KeyboardEvent) => focusTweet(e, -1)],
  [['e', 'l', 'arrowright'], focusLink],
  [['escape', 'arrowleft'], navBack],
  [['o'], () => navMedia()],
  [['f'], () => toggleFullscreen()]
]

const combineKey = (keys: string[]) =>
  keys
    .map(key => key.toLowerCase())
    .sort()
    .join('-')
const createKeyMap = (keyDefs: KeyDefs): [RegExp, Function][] => {
  return keyDefs.map(([keyCombos, action]) => {
    const pattern = keyCombos
      .map(keyCombo =>
        Array.isArray(keyCombo) ? combineKey(keyCombo) : keyCombo
      )
      .join('|')
    return [new RegExp(`^(${pattern})$`, 'i'), action]
  })
}

const keymap = createKeyMap(keyDefs)
const modKeyReg = /^(shift|alt|control|meta)$/i

const getCombinedKeyCode = (e: KeyboardEvent) => {
  const modKeyMap = {
    shift: e.shiftKey,
    alt: e.altKey,
    ctrl: e.ctrlKey,
    meta: e.metaKey
  }
  const keys = Object.entries(modKeyMap).reduce(
    (acc: string[], [key, isHolding]) => {
      return isHolding ? [...acc, key] : acc
    },
    [e.key]
  )
  return combineKey(keys)
}

const onKeyDown = (e: KeyboardEvent) => {
  // ignore when input tweet or search terms
  if (e.target) {
    const target = e.target as HTMLElement
    if (
      target.contentEditable === 'true' ||
      /^(input|textarea)$/i.test(target.tagName)
    ) {
      return
    }
  }

  // ignore modkey
  if (modKeyReg.test(e.key)) return

  const code = getCombinedKeyCode(e)

  keymap.some(([keyReg, action]) => {
    if (!keyReg.test(code)) return false
    if (action(e)) {
      e.preventDefault()
      e.stopPropagation()
    }
    return true
  })
}

const activateKeyHandler = (isActive: boolean) => {
  if (isActive) {
    document.addEventListener('keydown', onKeyDown)
  } else {
    document.removeEventListener('keydown', onKeyDown)
  }
}

const init = () => {
  activateKeyHandler(true)
}

init()
