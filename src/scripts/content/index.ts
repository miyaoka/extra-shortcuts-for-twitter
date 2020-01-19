type KeyDefs = [(string | string[])[], Function][]

let linkFocusIndex = 0
let extLinks: HTMLAnchorElement[] = []
let focusAnchorTarget: HTMLAnchorElement | null = null

const xLinkSelectors = ['[data-testid=tweet]', '[lang]'].map(
  container => `article ${container} a[target=_blank]`
)
const quoteSelector = '[role=blockquote]'
const focusSelector = [...xLinkSelectors, quoteSelector].join(',')

const getExtLinks = () => {
  const target = document.querySelector('article:focus')
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

const onFocusTweet = () => {
  window.requestAnimationFrame(() => {
    extLinks = getExtLinks()
    resetLinkFocus()
  })
}

const focusExtLink = () => {
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
const focusOut = () => {
  resetLinkFocus()

  if (!focusAnchorTarget) return
  const article = getContainerArticle(focusAnchorTarget)
  article?.focus()
}

const keyDefs: KeyDefs = [
  [['j', 'k'], () => onFocusTweet()],
  [['e'], () => focusExtLink()],
  [['escape'], () => focusOut()]
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
    if (action()) {
      e.preventDefault()
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
