import { MessageSquare, Github, Twitter, Linkedin } from "lucide-react";

export const LandingFooter = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    კომპანია: [
      { label: "ჩვენ შესახებ", href: "#" },
      { label: "ბლოგი", href: "#" },
      { label: "კარიერა", href: "#" },
      { label: "კონტაქტი", href: "#" },
    ],
    პროდუქტი: [
      { label: "შესაძლებლობები", href: "#features" },
      { label: "ფასები", href: "#pricing" },
      { label: "დოკუმენტაცია", href: "#" },
      { label: "API", href: "#" },
    ],
    იურიდიული: [
      { label: "წესები და პირობები", href: "#" },
      { label: "კონფიდენციალურობა", href: "#" },
      { label: "უსაფრთხოება", href: "#" },
      { label: "Cookie Policy", href: "#" },
    ],
  };

  const socialLinks = [
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
  ];

  return (
    <footer className="bg-muted/30 border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-xl">DualChat</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              პროფესიონალური გუნდური კომუნიკაცია კლიენტებთან.
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Footer link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {currentYear} DualChat. ყველა უფლება დაცულია.</p>
          <p>Made with ❤️ in Georgia</p>
        </div>
      </div>
    </footer>
  );
};
