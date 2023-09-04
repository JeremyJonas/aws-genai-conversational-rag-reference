import os

os.environ["PYTHON_ENV"] = "test"
os.environ["CODEBUILD_BUILD_ID"] = "test"
os.environ["CODEBUILD_SRC_DIR"] = os.path.join(os.getcwd(), ".test")
os.environ["ARTIFACT_BASE_DIR"] = "out"
os.environ["HF_REPO_ID"] = "sentence-transformers/all-mpnet-base-v2"

def test_build():
    from .build import model_tar_file

    assert str(model_tar_file) == os.path.join(os.environ["CODEBUILD_SRC_DIR"], "out", "model.tar.gz")
