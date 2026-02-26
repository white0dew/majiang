import Link from "next/link";
import Image from "next/image";

const links = [
  { href: "/", label: "首页" },
  { href: "/training", label: "训练大厅" },
  { href: "/rules", label: "麻将规则" },
  { href: "/progress", label: "我的成长" },
];

export function MainNav() {
  return (
    <header className="main-nav sticky top-0 z-20 border-b border-[#8d6e6324] bg-[#f5e7c8]/90 backdrop-blur">
      <nav className="main-nav__inner mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link className="brand-link" href="/">
          <Image
            className="brand-mark"
            src="/tiles/tiao-1.png"
            alt="1条"
            width={34}
            height={44}
            priority
          />
          <span className="brand-title">麻局教练</span>
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          {links.map((link) => (
            <Link key={link.href} className="nav-link" href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
