# Canvas node renderers, copied

A recipe is drawn as a real canvas: the same node chrome you see in the editor, so what
a recipe looks like here is what it will look like when you paste it.

THESE ARE COPIES. The originals live in `apps/canvas/src/components/nodes` and are the
platform's. They were copied because the marketplace deploys separately and cannot import
from the platform, and because a recipe that does not render is not worth publishing.

The cost is real and worth stating: restyle a node in Canvas and this will not follow.
When the marketplace gets a database and Agents become something sold, the honest fix is
for the platform to serve this rendering rather than for the marketplace to hold a second
copy of it.
