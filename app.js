import { h } from './h.js'
import { human } from './human.js'
import { cachekv } from './cachekv.js'

const API = "https://public.api.bsky.app/"
const DIR = "https://plc.directory/"
const db = await cachekv('skiesv1')

const renderPost = async (posturi, screen) => {
  const div = h('div', {classList: 'message'})
  screen.appendChild(div)
  const post = await getPost(posturi)
  //div.appendChild(h('pre', [JSON.stringify(post)]))

  const reply = h('div')
  const meta = h('div', [
    h('a', {href: '#' + post.uri, style: 'float: right;'}, [human(new Date(post.record.createdAt))]),
    h('img', {src: post.author.avatar, classList: 'avatar'}),
    h('a', {href: '#' + post.author.handle}, [post.author.displayName]),
    ' ',
    h('code', [post.author.handle]),
    reply
  ])
  div.appendChild(meta)

  const content = h('div', [post.record.text])
  div.appendChild(content)

  if (post.record.reply) {
    const replyPost = await getPost(post.record.reply.parent.uri)
    if (replyPost) {
      const rep = h('div', [
        ' ↲ ',
        h('a', {href: '#' + replyPost.author.handle}, [replyPost.author.displayName]),
        ' | ',
        h('a', {href: '#' + replyPost.uri}, [replyPost.record.text.substring(0, 24)])
      ])
      reply.parentNode.replaceChild(rep, reply)
    }
  }
}

const getPost = async (uri) => {
  const local = await db.get(uri)
  if (local) {  
    const obj = await JSON.parse(local)
    return obj
  } else {
    const url = `${API}xrpc/app.bsky.feed.getPosts?uris=${uri}`
    const p = await fetch(url)
    const json = await p.json()
    await db.put(uri, JSON.stringify(json.posts[0]))
    return json.posts[0]
  }
}

const route = async () => {
  const oldscreen = document.getElementById('screen')
  if (oldscreen) {oldscreen.remove()}
  document.body.style = 'margin: 0;'
  const screen = h('div', {id: 'screen', style: 'margin-left: auto; margin-right: auto; width: 680px; margin-top: 0;'})
  document.body.appendChild(screen)
  
  const src = window.location.hash.substring(1)

  if (src.startsWith('at://did:plc:')) {
    await renderPost(src, screen)
  } else if (src) {
    await profile(src, screen) 
  }

  if (src === '') {
    const input = h('input', {placeholder: 'Handle, ex: evbogue.com'})
    screen.appendChild(h('div', [input, h('button', {onclick: () => {
      if (input.value) {window.location.hash = input.value}
    }}, ['Go'])]))
  }
}

const profile = async (src, screen) => {
  //screen.appendChild(h('div', [src]))
  try {
    const resolve = await fetch(`${API}xrpc/com.atproto.identity.resolveHandle?handle=${src}`).then(r => r.json())
    if (resolve.did) {
      const namearea = h('strong')
      const bio = h('div')
      const banner = h('img', {style: 'width: 0; height: 0'})
      const prof = h('div', [
        banner,
        namearea,
        h('div', [resolve.did]),
        bio
      ])
      screen.appendChild(prof)
      const directory = await fetch(`${DIR}${resolve.did}`).then(r => r.json())
  
      const pds = directory.service[0].serviceEndpoint
      //screen.appendChild(h('div', [pds]))
      const repo = await fetch(`${pds}/xrpc/com.atproto.repo.describeRepo?repo=${resolve.did}`).then(r => r.json())
      //console.log(repo)
      //repo.collections.forEach(collection => {
      //  screen.appendChild(h('div', [collection]))
      //})
      const profile = await fetch(`${pds}/xrpc/com.atproto.repo.listRecords?repo=${resolve.did}&collection=app.bsky.actor.profile`).then(r => r.json())
      const name = profile.records[0].value.displayName
      namearea.textContent = name
      console.log(profile.records[0].value)
      bio.textContent = profile.records[0].value.description
      if (profile && profile.records[0].value.banner) {
        const link = `https://cdn.bsky.app/img/banner/plain/${resolve.did}/${profile.records[0].value.banner.ref.$link}@jpeg`
        banner.src = link
        banner.style = 'width: 100%; height: auto;' 
      }
      const posts = await fetch(`${pds}/xrpc/com.atproto.repo.listRecords?repo=${resolve.did}&collection=app.bsky.feed.post&limit=100`).then(r => r.json())
      for (const post of posts.records) {
        await renderPost(post.uri, screen)
      }
    }
  } catch (err) { console.log(err)}
} 

window.onhashchange = async () => {route()}
route()
