include /usr/share/dpkg/pkg-info.mk

PACKAGE=pve-eslint

GITVERSION:=$(shell git rev-parse HEAD)
BUILDDIR ?= ${PACKAGE}-${DEB_VERSION_UPSTREAM}

DEB=${PACKAGE}_${DEB_VERSION_UPSTREAM_REVISION}_all.deb
DSC=${PACKAGE}_${DEB_VERSION_UPSTREAM_REVISION}.dsc

SRCDIR=src
UPSTREAM=eslint
UPSTREAMTAG=v7.28.0
BUILDSRC=${UPSTREAM}-${UPSTREAMTAG}

all: ${DEB}
	@echo ${DEB}

.PHONY: dsc deb builddir

${BUILDDIR}: builddir
builddir: ${SRCDIR}
	rm -rf ${BUILDDIR}
	mkdir ${BUILDDIR}
	cp -a debian ${BUILDDIR}/
	cp -a ${SRCDIR}/* ${BUILDDIR}/
	echo "git clone git://git.proxmox.com/git/pve-eslint.git\\ngit checkout ${GITVERSION}" > ${BUILDDIR}/debian/SOURCE


dsc: ${DSC}
${DSC}: builddir
	cd ${BUILDDIR}; dpkg-buildpackage -S -uc -us
	lintian ${DSC}

deb: ${DEB}
${DEB}: builddir
	cd ${BUILDDIR}; dpkg-buildpackage -b -uc -us
	lintian ${DEB}
	@echo ${DEB}

.PHONY: download
download:
	rm -rf ${UPSTREAM}.tmp ${UPSTREAM}
	git clone -b ${UPSTREAMTAG} --depth 1 https://github.com/eslint/eslint ${UPSTREAM}.tmp
	rm -rf ${UPSTREAM}.tmp/.git
	find ${UPSTREAM}.tmp/ -type f -name '.gitignore' -delete
	mv ${UPSTREAM}.tmp ${UPSTREAM}

# NOTE: needs npm installed, downloads packages from npm
.PHONY: buildupstream
buildupstream: ${BUILDSRC}
	cp ${BUILDSRC}/build/eslint.js ${SRCDIR}/eslint.js

${BUILDSRC}: ${UPSTREAM} patches
	rm -rf $@
	mkdir $@.tmp
	rsync -ra ${UPSTREAM}/ $@.tmp
	cd $@.tmp; ln -s ../patches patches
	cd $@.tmp; quilt push -a
	cd $@.tmp; rm -rf .pc ./patches
	mv $@.tmp $@
	cd $@; npm install
	cd $@; npm run webpack

.PHONY: upload
upload: ${DEB}
	tar cf - ${DEB} | ssh -X repoman@repo.proxmox.com -- upload --product pmg,pve --dist bullseye

.PHONY: distclean
distclean: clean

.PHONY: clean
clean:
	rm -rf *~ debian/*~ *.deb ${BUILDSRC} *.tmp/ ${BUILDDIR} *.changes *.tar.gz *.dsc *.buildinfo

.PHONY: dinstall
dinstall: deb
	dpkg -i ${DEB}
