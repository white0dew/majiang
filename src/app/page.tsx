import Image from "next/image";
import Link from "next/link";

const highlights = [
  {
    title: "大局观训练",
    text: "每题都结合牌河、副露和定缺，不再只盯手牌。",
  },
  {
    title: "快速听胡识别",
    text: "通过限时快答提高实战反应，减少错过和牌机会。",
  },
  {
    title: "弃牌风险反馈",
    text: "系统展示向听、进张与放铳风险，帮助形成稳定决策习惯。",
  },
];

const githubRepo = "https://github.com/white0dew/majiang";

export default function Home() {
  return (
    <main className="page-wrap">
      <section className="hero-card">
        <p className="hero-kicker">多玩法麻将决策训练</p>
        <h1>麻局教练</h1>
        <p>
          支持四川、长沙、贵州、厦门、福建、沈阳、杭州、日本、苏州等玩法训练，专注提升大局观与决策速度。不是对战平台，而是针对实战弱点的训练工具。
        </p>
        <div className="hero-actions">
          <Link className="btn-primary" href="/training">
            开始训练
          </Link>
          <Link className="btn-ghost" href="/rules">
            麻将规则
          </Link>
        </div>
      </section>

      <section className="highlight-grid">
        {highlights.map((item) => (
          <article className="highlight-card" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="contact-card" aria-label="源码与作者联系方式">
        <div className="contact-main">
          <p className="hero-kicker">开源与交流</p>
          <h2>源码与作者微信</h2>
          <p>欢迎查看源码，也欢迎扫码交流实战问题与训练思路。</p>
          <p className="author-name">作者：青玉白露</p>
          <div className="contact-actions">
            <a
              className="btn-ghost contact-link"
              href={githubRepo}
              target="_blank"
              rel="noreferrer"
            >
              GitHub 源码地址
            </a>
            <details className="wechat-popover">
              <summary className="btn-ghost wechat-trigger">青玉白露微信二维码</summary>
              <figure className="wechat-panel">
                <Image
                  className="wechat-qr"
                  src="/whitedew.jpg"
                  alt="青玉白露微信二维码，微信号 whitedewstory"
                  width={220}
                  height={310}
                />
                <figcaption className="wechat-id">
                  作者：青玉白露 · 微信号：whitedewstory
                </figcaption>
              </figure>
            </details>
          </div>
          <p className="contact-note">悬停可弹出二维码，移动端可点击查看。</p>
          <p className="contact-url">{githubRepo}</p>
        </div>
      </section>
    </main>
  );
}
