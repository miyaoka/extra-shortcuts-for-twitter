type KeyDefs = [(string | string[])[], Function][]

let linkFocusIndex = 0
let extLinks: HTMLAnchorElement[] = []
let target: HTMLAnchorElement | null = null
const getExtLinks = () => {
  const target = document.querySelector(
    'article[data-focusvisible-polyfill=true]'
  )
  if (!target) return []

  const list = Array.from(
    target.querySelectorAll('a[target=_blank]')
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

  target = extLinks[linkFocusIndex]
  if (!target) return
  target.setAttribute(
    'style',
    `background: rgba(255,255,0,1); outline: 1px solid #990`
  )
  target.focus()
  linkFocusIndex = (linkFocusIndex + 1) % extLinks.length
}

const getArticle = (el: HTMLElement): HTMLElement | null => {
  const parent = el.parentElement
  if (!parent) return null
  console.log(parent, parent.tagName)
  if (parent.tagName === 'ARTICLE') return parent
  return getArticle(parent)
}
const focusOut = () => {
  resetLinkFocus()

  if (!target) return
  const article = getArticle(target)
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
  if (modKeyReg.test(e.key)) return

  const code = getCombinedKeyCode(e)
  console.log(code)

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
  const formInputs = document.querySelectorAll('input, textarea')

  formInputs.forEach(el => {
    el.addEventListener('focusin', () => activateKeyHandler(false))
    el.addEventListener('focusout', () => activateKeyHandler(true))
  })

  activateKeyHandler(true)
}

init()
