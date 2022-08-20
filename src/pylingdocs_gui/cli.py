"""Console script for pylingdocs-gui."""
import sys
import click
from pylingdocs.config import CLDF_MD
from pylingdocs.config import OUTPUT_DIR
from pylingdocs_gui.editor import Editor


@click.command()
@click.option("--source", default=".", help="Source folder to process.")
@click.option("--cldf", default=CLDF_MD, help="Path to metadata.json of CLDF dataset.")
@click.option(
    "--output-dir", default=OUTPUT_DIR, help="Folder where output is generated."
)
def main(cldf, source, output_dir):
    print("WEEEE")
    e = Editor(cldf, source, output_dir)
    e.run()


if __name__ == "__main__":
    main()
