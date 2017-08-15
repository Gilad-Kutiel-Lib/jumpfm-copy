import { JumpFm } from 'jumpfm-api'

import * as fs from 'fs-extra'
import * as path from 'path'
import * as progress from 'progress-stream'


interface cp {
    fileFullPath: string
    dirFullPath: string
}

export const load = (jumpFm: JumpFm) => {
    let copying: boolean = false
    const q: cp[] = []

    const done = () => {
        jumpFm.statusBar.clear('q')
        jumpFm.statusBar.clear('cp')
    }

    const cpFileAndPop = () => {
        if (q.length == 0) return done()
        if (copying) return

        copying = true

        const cp = q[q.length - 1]

        const prog = progress({
            length: fs.statSync(cp.fileFullPath).size,
            time: 200
        }, (prog) => {
            jumpFm.statusBar.info('cp', {
                txt: `cp ${prog.percentage.toFixed(0)}%`,
                dataTitle: path.basename(cp.fileFullPath)
            })
        })

        const out = fs.createWriteStream(
            path.join(
                cp.dirFullPath,
                path.basename(cp.fileFullPath)
            )
        )

        out.on('close', () => {
            copying = false
            q.pop()
            cpFileAndPop()
        })

        fs.createReadStream(cp.fileFullPath)
            .pipe(prog)
            .pipe(out)
    }


    const mkdirp = (dirFullPath) =>
        fs.existsSync(dirFullPath) ||
        fs.mkdirSync(dirFullPath)

    const cpDir = (sourceDirFullPath: string, targetDirFullPath: string) => {
        const destDir = path.join(
            targetDirFullPath,
            path.basename(sourceDirFullPath)
        )

        mkdirp(destDir)

        cp(
            fs.readdirSync(sourceDirFullPath)
                .map(file => path.join(sourceDirFullPath, file)),
            destDir
        )
    }

    const cp = (fullPaths: string[], distDirFullPath: string) => {
        fullPaths.forEach((fullPath) => {
            if (fs.statSync(fullPath).isDirectory())
                return cpDir(fullPath, distDirFullPath)

            q.unshift({
                fileFullPath: fullPath,
                dirFullPath: distDirFullPath
            })

            jumpFm.statusBar.warn('q', {
                txt: `q[${q.length}]`,
                dataTitle: path.basename(fullPath)
            }, 5000)
        })

        cpFileAndPop()
    }

    const selectedFiles = jumpFm.getActivePanel().getSelectedItemsPaths
    const distDir = jumpFm.getPassivePanel().getPath
    jumpFm.bindKeys('copy', ['f5'], () => {
        cp(selectedFiles(), distDir())
    }).filterMode()
}