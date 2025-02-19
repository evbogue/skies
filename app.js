import { h } from './h.js'
import { human } from './human.js'

const API = "https://public.api.bsky.app/"
const DIR = "https://plc.directory/"

//const getHandle = async (did) => {
//  const profile = await fetch(`${pds}/xrpc/com.atproto.repo.listRecords?repo=${resolve.did}&collection=app.bsky.actor.profile`).then(r => r.json())
//  const name = profile.records[0].value.displayName
//}

const getPost = async (uri) => {
  const url = `${API}xrpc/app.bsky.feed.getPosts?uris=${uri}`
  const p = await fetch(url)
  const json = await p.json()
  return json.posts[0]
}

const route = async () => {
  const oldscreen = document.getElementById('screen')
  if (oldscreen) {oldscreen.remove()}
  const screen = h('div', {id: 'screen'})
  document.body.appendChild(screen)
  
  const src = window.location.hash.substring(1)

  if (src) {
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
  screen.appendChild(h('div', [src]))
  try {
    const resolve = await fetch(`${API}xrpc/com.atproto.identity.resolveHandle?handle=${src}`).then(r => r.json())
    console.log(resolve)
    if (resolve.did) {
      screen.appendChild(h('div', [resolve.did]))
      const directory = await fetch(`${DIR}${resolve.did}`).then(r => r.json())
  
      const pds = directory.service[0].serviceEndpoint
      screen.appendChild(h('div', [pds]))
      const repo = await fetch(`${pds}/xrpc/com.atproto.repo.describeRepo?repo=${resolve.did}`).then(r => r.json())
      //console.log(repo)
      //repo.collections.forEach(collection => {
      //  screen.appendChild(h('div', [collection]))
      //})
      const profile = await fetch(`${pds}/xrpc/com.atproto.repo.listRecords?repo=${resolve.did}&collection=app.bsky.actor.profile`).then(r => r.json())
      const name = profile.records[0].value.displayName
      const posts = await fetch(`${pds}/xrpc/com.atproto.repo.listRecords?repo=${resolve.did}&collection=app.bsky.feed.post&limit=100`).then(r => r.json())
      for (const post of posts.records) {
        const reply = h('div')
        const div = h('div', {classList: 'message'}, [
          h('span', {style: 'float: right;'}, [human(new Date(post.value.createdAt))]),
          h('a', {href: '#' + repo.handle}, [name]),
          ' ',
          h('span', [repo.handle]),
          reply,
          h('div', [post.value.text])
        ])
        screen.appendChild(div)
        if (post.value.reply) {
          const replyPost = await getPost(post.value.reply.root.uri)
          if (replyPost) {
            console.log(replyPost)
            const rep = h('div', [
              h('a', {href: '#' + replyPost.author.handle}, ['@' + replyPost.author.displayName]),
              ' ↲ ',
              h('a', {href: '#' + replyPost.uri}, [replyPost.record.text.substring(0, 24)])
            ])
            reply.parentNode.replaceChild(rep, reply)
          }
        }

        if (post.value.embed && post.value.embed.external) {
          div.appendChild(h('a', {href: post.value.embed.external.uri}, [post.value.embed.external.title]))
        }
        //div.appendChild(h('pre', [JSON.stringify(post)]))
      }
    }
  } catch (err) { console.log(err)}
} 

window.onhashchange = async () => {route()}
route()
