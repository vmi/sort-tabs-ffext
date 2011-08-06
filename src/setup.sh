#!/bin/sh

pf=sort-tabs-by-uri@vmi.jp
if [ -f /usr/bin/cygpath ]; then
  cygpath -aw . > $pf
  echo -n "$pf: "
  cat $pf
  for d in "$HOME/Application Data/Mozilla/Firefox/Profiles/"*"/extensions"; do
    cp -v $pf "$d"
  done
else
  echo "No cygwin."
fi
