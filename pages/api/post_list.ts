// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

export type PostItemData = {
  id: string
  title: string
  updateTime: number
  content: string
}

export type PostListData = {
  data: {
    list: PostItemData[]
    total: number
  }
}

const list = [
  {
    id: Math.random().toString(16).slice(2),
    title: 'React 原理',
    updateTime: Date.now(),
    content:
      'whatwg 的标准里面讲了，为了协调事件、用户交互、脚本、渲染、网络等，用户代理必须使用事件循环。每个代理都有一个关联的事件循环，这是该代理独有的。',
  },
  {
    id: Math.random().toString(16).slice(2),
    title: 'React 原理',
    updateTime: Date.now(),
    content:
      'whatwg 的标准里面讲了，为了协调事件、用户交互、脚本、渲染、网络等，用户代理必须使用事件循环。每个代理都有一个关联的事件循环，这是该代理独有的。',
  },
  {
    id: Math.random().toString(16).slice(2),
    title: 'React 原理',
    updateTime: Date.now(),
    content:
      'whatwg 的标准里面讲了，为了协调事件、用户交互、脚本、渲染、网络等，用户代理必须使用事件循环。每个代理都有一个关联的事件循环，这是该代理独有的。',
  },
  {
    id: Math.random().toString(16).slice(2),
    title: 'React 原理',
    updateTime: Date.now(),
    content:
      'whatwg 的标准里面讲了，为了协调事件、用户交互、脚本、渲染、网络等，用户代理必须使用事件循环。每个代理都有一个关联的事件循环，这是该代理独有的。',
  },
]

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<PostListData>
) {
  res.status(200).json({
    data: {
      list,
      total: list.length,
    },
  })
}
