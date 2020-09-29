# Tags - Nera plugin
This is a plugin for the static side generator [Nera](https://github.com/seebaermichi/nera) to generate a tag cloud, tag links and tag overview pages out of tags of a page.  
You can setup a couple of things, but it general everything which is required are some comma separated tags in your Markdown meeta section.

## Usage
To install this plugin, just copy or clone all of this plugins code into the `src/plugins`folder of your Nera project.  

In addition you could setup a few things in the `config/tags.yaml`.
```yaml
meta_property_name: tags # optional
tag_overview_path: '' # optional
tag_separator: ',' # optional
tag_overview_layout: pages/default.pug # optional
tag_overview_website_image: /img/banner/website-banner.jpg # optional
tag_overview_default_image: /img/banner/banner.jpg # optional
```
As you see all properties are optional. The values showing here are the defaults, at least for the first four properties.  

If you would like to use more configuations properties, you can just add them to the `config/tags.yaml`. You can later use them within your templates by calling e.g. `app.tagsConfig.tag_overview_whatever_variable`.
