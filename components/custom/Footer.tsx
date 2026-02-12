import { GitHubIcon, TwitterIcon, LinkedInIcon } from './socialIcons';

export function Footer() {
  return (
    <footer className="font-inter border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-12 text-gray-900 dark:border-gray-800 dark:from-gray-900 dark:to-black dark:text-white">
      <div className="container mx-auto grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <h3 className="bg-app-color text-3xl font-extrabold">ILokal</h3>
          </div>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            Innovating for a better tomorrow. We are committed to delivering
            high-quality solutions that empower businesses and individuals.
          </p>
          <div className="flex space-x-5 pt-2">
            <a
              href="#"
              className="transform text-gray-500 transition-transform hover:scale-110 hover:text-blue-600 dark:text-gray-400 dark:hover:text-teal-400"
            >
              <GitHubIcon size={28} />
            </a>
            <a
              href="#"
              className="transform text-gray-500 transition-transform hover:scale-110 hover:text-blue-600 dark:text-gray-400 dark:hover:text-teal-400"
            >
              <TwitterIcon size={28} />
            </a>
            <a
              href="#"
              className="transform text-gray-500 transition-transform hover:scale-110 hover:text-blue-600 dark:text-gray-400 dark:hover:text-teal-400"
            >
              <LinkedInIcon size={28} />
            </a>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Quick Links
          </h3>
          <ul className="space-y-3">
            <li>
              <a
                href="#"
                className="text-gray-600 transition-colors duration-300 hover:text-blue-600 dark:text-gray-300 dark:hover:text-teal-400"
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-gray-600 transition-colors duration-300 hover:text-blue-600 dark:text-gray-300 dark:hover:text-teal-400"
              >
                About Us
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-gray-600 transition-colors duration-300 hover:text-blue-600 dark:text-gray-300 dark:hover:text-teal-400"
              >
                Services
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-gray-600 transition-colors duration-300 hover:text-blue-600 dark:text-gray-300 dark:hover:text-teal-400"
              >
                Portfolio
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-gray-600 transition-colors duration-300 hover:text-blue-600 dark:text-gray-300 dark:hover:text-teal-400"
              >
                Blog
              </a>
            </li>
          </ul>
        </div>
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Resources
          </h3>
          <ul className="space-y-3">
            <li>
              <a
                href="#"
                className="text-gray-600 transition-colors duration-300 hover:text-blue-600 dark:text-gray-300 dark:hover:text-teal-400"
              >
                Support
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-gray-600 transition-colors duration-300 hover:text-blue-600 dark:text-gray-300 dark:hover:text-teal-400"
              >
                FAQs
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-gray-600 transition-colors duration-300 hover:text-blue-600 dark:text-gray-300 dark:hover:text-teal-400"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-gray-600 transition-colors duration-300 hover:text-blue-600 dark:text-gray-300 dark:hover:text-teal-400"
              >
                Terms of Service
              </a>
            </li>
            <li>
              <a
                href="#"
                className="text-gray-600 transition-colors duration-300 hover:text-blue-600 dark:text-gray-300 dark:hover:text-teal-400"
              >
                Careers
              </a>
            </li>
          </ul>
        </div>
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Contact Us
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            123 Tech Avenue, Innovation City, 98765
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            Email: info@yourbrand.com
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            Phone: +1 (555) 123-4567
          </p>
        </div>
      </div>
      <div className="mt-10 border-t border-gray-200 pt-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        <p>
          &copy; {new Date().getFullYear()} Your Brand. All rights reserved.
        </p>
        <p className="mt-1">
          Designed with <span className="text-red-500">&hearts;</span> by Your
          Company
        </p>
      </div>
    </footer>
  );
}
