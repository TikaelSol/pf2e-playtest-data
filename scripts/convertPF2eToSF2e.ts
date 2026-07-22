import fs from "node:fs";
import path from "node:path";
import process from "node:process";

let mPath = process.argv[2];

// If two arguments are provided, run in data-conversion mode: copy/convert
// pack JSON files from a source folder to a target folder without treating
// the folders as module roots (avoids looking for module.json in the pack).
const convertSrc = process.argv[2];
const convertDst = process.argv[3];
if (convertSrc && convertDst) {
    function copyDirRecursive(src: string, dst: string) {
        fs.mkdirSync(dst, { recursive: true });
        for (const name of fs.readdirSync(src)) {
            const s = path.join(src, name);
            const d = path.join(dst, name);
            const st = fs.statSync(s);
            if (st.isDirectory()) copyDirRecursive(s, d);
            else if (st.isFile()) {
                if (name.endsWith(".json")) {
                    let content = fs.readFileSync(s, "utf-8");
                    try {
                        const parsed = JSON.parse(content);
                        if (parsed && typeof parsed === "object") {
                            // Lightweight conversion: change top-level system id if present
                            if ((parsed as any).system === "pf2e") (parsed as any).system = "sf2e";
                            content = JSON.stringify(parsed, null, "\t") + "\n";
                        }
                    } catch (err) {
                        // not JSON or parse failed — copy raw
                    }
                    fs.writeFileSync(d, content);
                } else {
                    fs.copyFileSync(s, d);
                }
            }
        }
    }

    if (!fs.existsSync(convertSrc)) {
        console.error(`Source folder not found: ${convertSrc}`);
        process.exit(1);
    }
    fs.mkdirSync(convertDst, { recursive: true });
    copyDirRecursive(convertSrc, convertDst);
    console.log(`Copied/converted data from ${convertSrc} -> ${convertDst}`);
    process.exit(0);
}

if (!mPath) {
    console.error("Usage: bun run scripts/convertPF2eToSF2e.ts <module-path>");
    process.exit(1);
}

const hasPathSeparator = /[\\/]/.test(mPath);
const isAbsolutePath = path.isAbsolute(mPath) || /^[a-zA-Z]:[\\/]/.test(mPath);

if (!hasPathSeparator && !isAbsolutePath) {
    mPath = path.join("fvtt-modules", `pf2e-team-plus-${mPath}`);
}

const moduleDir = path.resolve(mPath);
const moduleJsonPath = path.join(moduleDir, "module.json");

if (!fs.existsSync(moduleJsonPath)) {
    console.error(`module.json not found at ${moduleJsonPath}`);
    process.exit(1);
}

const moduleJson = JSON.parse(fs.readFileSync(moduleJsonPath, "utf-8"));

if (moduleJson.relationships?.systems?.some((s: { id: string }) => s.id === "sf2e")) {
    console.log("Module already has sf2e system in relationships. Skipping...");
} else {
    moduleJson.relationships ??= {};
    moduleJson.relationships.systems ??= [];
    moduleJson.relationships.systems.push({
        id: "sf2e",
        type: "system",
        compatibility: {
            minimum: "1.0.3",
        },
    });
    console.log("Added sf2e system to relationships");
}

// Only converts Actors and Items, others are not necessary and can be done manually
const pf2ePacks = (moduleJson.packs ?? []).filter(
    (pack: { system?: string; type?: string }) => pack.system === "pf2e" && (pack.type === "Actor" || pack.type === "Item")
);

const sf2ePackNames: string[] = [];

for (const pf2ePack of pf2ePacks) {
    let sf2eName = pf2ePack.name.replace(/^pf2e-/, "sf2e-");
    if (!sf2eName.includes("sf2e-")) sf2eName = `sf2e-${sf2eName}`;
    sf2ePackNames.push(sf2eName);

    const sf2ePack: Record<string, unknown> = {
        name: sf2eName,
        label: pf2ePack.label,
        path: `packs/${sf2eName}`,
        type: pf2ePack.type,
        system: "sf2e",
        flags: {},
    };

    sf2ePack.banner = pf2ePack.banner;
    sf2ePack.ownership = pf2ePack.ownership;

    moduleJson.packs.push(sf2ePack);
    console.log(`Added sf2e pack: ${sf2eName}`);

    const sourceDataDir = path.join(moduleDir, "packs", pf2ePack.name);
    const targetDataDir = path.join(moduleDir, "packs", sf2eName);

    if (fs.existsSync(sourceDataDir)) {
        console.log(`Converting data: ${pf2ePack.name} -> ${sf2eName}`);
        const convertScript = path.join(process.cwd(), "scripts", "convertPF2eToSF2e.ts");
        const result = Bun.spawnSync(["bun", "run", convertScript, sourceDataDir, targetDataDir], {
            cwd: moduleDir,
            stdout: "pipe",
            stderr: "inherit",
        });

        if (result.exitCode !== 0) {
            console.error(`Failed to convert data for ${pf2ePack.name}`);
        }
    } else {
        console.log(`No data directory found for ${pf2ePack.name}, skipping conversion`);
    }
}

function updatePackFolders(obj: unknown, sf2eNames: string[]): void {
    if (Array.isArray(obj)) {
        for (const item of obj) {
            updatePackFolders(item, sf2eNames);
        }
    } else if (obj !== null && typeof obj === "object") {
        const record = obj as Record<string, unknown>;
        if (Array.isArray(record.packs)) {
            for (const name of sf2eNames) {
                if (!(record.packs as string[]).includes(name)) {
                    record.packs.push(name);
                }
            }
        }
        for (const value of Object.values(record)) {
            updatePackFolders(value, sf2eNames);
        }
    }
}

if (moduleJson.packFolders) {
    updatePackFolders(moduleJson.packFolders, sf2ePackNames);
    console.log("Updated packFolders with sf2e pack names");
}

fs.writeFileSync(moduleJsonPath, JSON.stringify(moduleJson, null, "\t") + "\n");
console.log("Conversion complete!");