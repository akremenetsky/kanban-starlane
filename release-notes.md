### Added
- **List descriptions.** A list can have an optional description, shown under its title in a
  smaller, muted font. Add or edit it from the list menu (*Add description* / *Edit
  description*), by double-clicking it, or when creating a list. It is stored in the board
  file as text right under the list's heading, so it is readable without the plugin.
  Text that was already written under a list's heading is now shown as its description
  instead of being removed on save.

### Fixed
- Cards of several lines showed their service id (such as `^mmwuwm`) at the end of the first
  line; the id is hidden again.
- Tags at the start of a card's second (or later) line were not recognised: no tag badge, tag
  colour or *Move tags to footer*.
