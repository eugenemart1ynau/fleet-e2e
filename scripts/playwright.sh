#!/bin/sh
# Keep the list reporter colored. Cursor sets NO_COLOR, and Node warns if FORCE_COLOR is set too.
unset NO_COLOR
export FORCE_COLOR=1
exec playwright test "$@"
