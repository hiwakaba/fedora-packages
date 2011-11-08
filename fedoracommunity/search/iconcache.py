import os

from rpmcache import RPMCache
from gi.repository import GdkPixbuf

class IconCache(object):
    def __init__(self, yum_base, icon_rpm_names, icon_dir):
        self.found_icons = {} # {'icon-name': True}
        self._rpm_caches = []
        self._rpm_caches.extend(icon_rpm_names)
        self.yum_base = yum_base
        self.icon_dir = icon_dir

    def check_pkg(self, pkg):
        try:
            i = self._rpm_caches.index(pkg['name'])
            self._rpm_caches[i] = RPMCache(pkg, self.yum_base)
            self._rpm_caches[i].open()
        except ValueError:
            pass

    def _find_best_icon(self, icon, cache):
        icon_path_list = cache.find_files(icon + '.png', '*.png')
        best_match = None

        for icon_path in icon_path_list:
            pixbuf = GdkPixbuf.Pixbuf.new_from_file(icon_path)
            width = pixbuf.get_width()



            # try to find the best match to 128x128
            if width == 128:
                return pixbuf
            elif best_match == None:
                best_match = pixbuf
            elif width > 128:
                best_match_width = best_match.get_width()
                if best_match_width < 128:
                    best_match = pixbuf
                elif width < best_match_width:
                    best_match = pixbuf
            elif width < 128:
                best_match_width = best_match.get_width()
                if best_match_width > 128:
                    continue
                elif width > best_match_width:
                    best_match = pixbuf

        if not best_match:
            return None

        if best_match.get_width() > 128:
            # resize to 128
            best_match = best_match.scale_simple(128, 128, 
                                                 GdkPixbuf.InterpType.HYPER)
        else:
            # smaller icons should be pasted onto a generic icon in
            # the future but for now just resize
            best_match = best_match.scale_simple(128, 128, 
                                                 GdkPixbuf.InterpType.HYPER)

        return best_match

    def generate_icon(self, icon_name, extra_cache):
        if self.found_icons.get(icon_name, None):
            return icon_name
        else:
            search_packages = [extra_cache]
            search_packages.extend(self._rpm_caches)

            for icon_rpm_cache in search_packages:
                icon = self._find_best_icon(icon_name, icon_rpm_cache)

                if icon:
                    self.found_icons[icon_name] = True
                    icon.savev(os.path.join(self.icon_dir, icon_name + '.png'),
                               'png',
                               [],[])
                    return icon_name

    def close(self):
        for cache in self._rpm_caches:
            if isinstance(cache, RPMCache):
                cache.close()
