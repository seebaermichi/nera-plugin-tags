# Tags - Nera plugin
This is a plugin for the static side generator [Nera](https://github.com/seebaermichi/nera) to generate a tag cloud, tag links and tag overview pages out of tags of a page.  
You can setup a couple of things, but in general everything which is required are some comma separated tags in your Markdown meta section.

## Usage
To install this plugin, just copy or clone all of this plugins code into the `src/plugins` folder of your Nera project.  

In addition you could setup a few things in the `src/plugins/tags/config/tags.yaml`.
```yaml
# all optional, the values given here are the defaults
meta_property_name: tags
tag_overview_path: '/tags'
tag_separator: ','
tag_overview_layout: pages/default.pug

# examples
tag_overview_default_image: /img/banner/banner.jpg
tag_overview_website_image: /img/banner/website-banner.jpg
```
As you see all properties are optional. The values showing here are the defaults, at least for the first four properties.  

If you would like to use more configurations properties, you can just add them to the `src/plugins/tags/config/tags.yaml`. You can later use them within your templates by calling e.g. `app.tagsConfig.tag_overview_whatever_variable`.
