# remember to change config.yml: 
# url: https://www.cs.cornell.edu # the base hostname & protocol for your site
# baseurl: /~aaronferber/  # the subpath of your site, e.g. /blog/. Leave blank for root
# url: https://aaron-ferber.github.io # the base hostname & protocol for your site
# baseurl:   # the subpath of your site, e.g. /blog/. Leave blank for root

docker compose up --build
scp -r _site/* amf272@linux.coecis.cornell.edu:/cs/people/amf272/